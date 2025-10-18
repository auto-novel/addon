#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re
import sys
import argparse
from typing import List, Optional

def analyze_log_file(file_path: str) -> Optional[dict]:
    """
    Analyzes a log file to extract timing data and compute statistics.

    Args:
        file_path (str): The path to the log file.

    Returns:
        Optional[dict]: A dictionary with statistics if successful, otherwise None.
    """
    # 正则表达式设计：
    # \s*                   - 匹配 "http_fetch(ms):" 前面可能存在的任意空格
    # http_fetch\(ms\):\s*  - 精确匹配 "http_fetch(ms):" 和后面的任意空格。
    #                         注意：( 和 ) 是特殊字符，需要用 \ 转义。
    # (\d+\.?\d*)           - 这是我们的捕获组 (Capture Group)，用于提取数字:
    #   \d+                 - 匹配一个或多个数字 (整数部分)
    #   \.?                 - 匹配一个可选的小数点 (\. 表示字面上的点, ? 表示0次或1次)
    #   \d*                 - 匹配小数点后的零个或多个数字 (小数部分)
    pattern = re.compile(r"http_fetch\(ms\):\s*(\d+\.?\d*)")

    timings: List[float] = []
    line_count = 0

    print(f"[*] Analyzing log file: {file_path}")

    try:
        # 使用 'with' 语句确保文件被正确关闭，'encoding='utf-8'' 是良好的实践
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line_count += 1
                # 在每一行中搜索匹配项
                match = pattern.search(line)
                if match:
                    # match.group(1) 获取第一个捕获组的内容 (即括号内的部分)
                    try:
                        time_value = float(match.group(1))
                        timings.append(time_value)
                    except (ValueError, IndexError):
                        # 理论上，我们的正则表达式能确保这里不会出错，但加上以防万一
                        print(f"Warning: Found a match but failed to parse number on line: {line.strip()}", file=sys.stderr)
    except FileNotFoundError:
        print(f"Error: File not found at '{file_path}'", file=sys.stderr)
        return None
    except Exception as e:
        print(f"An unexpected error occurred: {e}", file=sys.stderr)
        return None

    if not timings:
        print(f"[!] Processed {line_count} lines, but found no valid timing entries.")
        return None

    # --- 计算统计数据 ---
    count = len(timings)
    total_time = sum(timings)
    average_time = total_time / count
    min_time = min(timings)
    max_time = max(timings)

    return {
        "total_lines": line_count,
        "valid_entries": count,
        "average_time_ms": average_time,
        "min_time_ms": min_time,
        "max_time_ms": max_time,
        "total_time_ms": total_time
    }

def main():
    """Main function to parse command-line arguments and run the analysis."""
    # 使用 argparse 提供一个专业的命令行接口
    parser = argparse.ArgumentParser(
        description="Extract timing data from log files and calculate the average.",
        formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument(
        "logfile",
        help="Path to the log file to be analyzed."
    )
    args = parser.parse_args()

    results = analyze_log_file(args.logfile)

    if results:
        print("\n--- Timing Analysis Results ---")
        print(f"  Processed Lines:   {results['total_lines']}")
        print(f"  Valid Entries Found: {results['valid_entries']}")
        print("  -----------------------------")
        # 使用 f-string 格式化输出，保留两位小数
        print(f"  Average Time:      {results['average_time_ms']:.2f} ms")
        print(f"  Min Time:          {results['min_time_ms']:.2f} ms")
        print(f"  Max Time:          {results['max_time_ms']:.2f} ms")
        print(f"  Total Time:        {results['total_time_ms']:.2f} ms")
        print("-------------------------------\n")

if __name__ == "__main__":
    main()

