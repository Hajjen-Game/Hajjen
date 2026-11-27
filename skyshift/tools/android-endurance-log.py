#!/usr/bin/env python3
"""Read-only Android telemetry to JSONL. Requires authorized adb and Python 3."""
import argparse
import datetime
import json
import re
import subprocess
import time

def adb(*args):
    try:
        p = subprocess.run(["adb", *args], capture_output=True, text=True, timeout=12)
        return p.stdout if p.returncode == 0 else None
    except (OSError, subprocess.TimeoutExpired):
        return None

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="skyshift-android-endurance.jsonl")
    parser.add_argument("--interval", type=float, default=10)
    args = parser.parse_args()
    if args.interval < 5:
        parser.error("Use an interval of at least five seconds")
    if (adb("get-state") or "").strip() != "device":
        parser.error("One authorized Android device must be available to adb")
    print("Recording until Ctrl+C; no device settings are changed.")
    with open(args.out, "a", encoding="utf-8") as out:
        try:
            while True:
                started = time.monotonic()
                stamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
                battery = adb("shell", "dumpsys", "battery") or ""
                thermal = adb("shell", "dumpsys", "thermalservice")
                temp = re.search(r"^\s*temperature:\s*(-?\d+)\s*$", battery, re.M)
                level = re.search(r"^\s*level:\s*(\d+)\s*$", battery, re.M)
                status = re.search(r"^\s*status:\s*(\d+)\s*$", battery, re.M)
                row = {"utc": stamp, "batteryTemperatureC": int(temp[1])/10 if temp else None,
                       "batteryLevelPercent": int(level[1]) if level else None,
                       "androidBatteryStatus": int(status[1]) if status else None,
                       "thermalServiceRaw": thermal, "source": "adb dumpsys (read-only)"}
                out.write(json.dumps(row, ensure_ascii=False)+"\n")
                out.flush()
                print(stamp, row["batteryTemperatureC"], "battery C", flush=True)
                time.sleep(max(0, args.interval-(time.monotonic()-started)))
        except KeyboardInterrupt:
            print("\nSaved", args.out)

if __name__ == "__main__":
    main()
