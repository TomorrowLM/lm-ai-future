"""
Variables Exercise 5 (variables5.py)
This exercise focuses on string indexing and slicing using a DNA sequence.
Follow the TODO instructions and fix any issues.
Uncomment and complete each section to pass all tests.

In DNA each letter is defined as a `base`, we can interchange `base` with `index`
"""
"""
变量练习 5（variables5.py）
本练习重点学习使用 DNA 序列进行字符串索引和切片。
请按照 TODO 指示操作并修复所有问题。取消注释并完成每个部分以通过所有测试。

在 DNA 中，每个字母被定义为一个 `碱基`（base），我们可以将 `base` 与 `index`（索引）互换使用
"""

# === DNA STRING INDEXING ===
# === DNA 字符串索引 ===
# TODO: Extract specific characters from the DNA sequence
# TODO: 从 DNA 序列中提取特定字符

dna_sequence = "AGCTTAGGCTA"

# TODO: Extract the first base of dna_sequence
# TODO: 提取 dna_sequence 的第一个碱基
first_base = __ 

# TODO: Extract the last base of dna_sequence
# TODO: 提取 dna_sequence 的最后一个碱基
last_base = __  

# TODO: Extract the third base of dna_sequence
# TODO: 提取 dna_sequence 的第三个碱基
third_base = __  

# === DNA STRING SLICING ===
# === DNA 字符串切片 ===
# TODO: Extract substrings using slicing
# TODO: 使用切片提取子字符串

# TODO: Extract the first five bases of dna_sequence
# TODO: 提取 dna_sequence 的前五个碱基
first_five_bases = __ 

# TODO: Extract the last five bases of dna_sequence
# TODO: 提取 dna_sequence 的后五个碱基
last_five_bases = __

# TODO: Extract the middle four bases (assuming dna_sequence has 10+ bases)
# TODO: 提取中间四个碱基（假设 dna_sequence 有 10 个以上碱基）
middle_bases = __  

# === DNA REVERSE COMPLEMENT (BASIC) ===
# === DNA 反向互补（基础）===
# TODO: Reverse the DNA sequence using slicing
# TODO: 使用切片反转 DNA 序列

# TODO: Reverse dna_sequence using slicing
# TODO: 使用切片反转 dna_sequence
reversed_dna = __

# === TESTS ===
# === 测试 ===
# Call the variables to test DNA string indexing and slicing
# 调用变量以测试 DNA 字符串索引和切片

assert first_base == "A", f"[FAIL] Expected 'A', got '{first_base}'"
assert last_base == "A", f"[FAIL] Expected 'A', got '{last_base}'"
assert third_base == "C", f"[FAIL] Expected 'C', got '{third_base}'"
assert first_five_bases == "AGCTT", f"[FAIL] Expected 'AGCTT', got '{first_five_bases}'"
assert last_five_bases == "GGCTA", f"[FAIL] Expected 'GGCTA', got '{last_five_bases}'"
assert middle_bases == "TAGG", f"[FAIL] Expected 'TAGG', got '{middle_bases}'"
assert reversed_dna == "ATCGGATTCGA", f"[FAIL] Expected 'ATCGGATTCGA', got '{reversed_dna}'"

print(f"DNA Sequence: {dna_sequence}")
print(f"First base:{first_base}")
print(f"Third base:{third_base}")
print(f"Last base:{last_base}")

print(f"First Five base:{first_five_base}")
print(f"Middle base:{middle_base}")
print(f"Last Five base:{last_five_base}")

print(f"DNA Sequence Reversed: {reversed_dna}")