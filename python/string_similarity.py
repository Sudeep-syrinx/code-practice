def levenshtein_distance(s1, s2):
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]

def jaro_winkler(s1, s2):
    if s1 == s2:
        return 1.0
    len1, len2 = len(s1), len(s2)
    match_distance = max(len1, len2) // 2 - 1
    
    s1_matches = [False] * len1
    s2_matches = [False] * len2
    matches = 0
    
    for i in range(len1):
        start = max(0, i - match_distance)
        end = min(i + match_distance + 1, len2)
        for j in range(start, end):
            if s2_matches[j]:
                continue
            if s1[i] != s2[j]:
                continue
            s1_matches[i] = True
            s2_matches[j] = True
            matches += 1
            break
            
    if matches == 0:
        return 0.0
        
    t = 0
    k = 0
    for i in range(len1):
        if not s1_matches[i]:
            continue
        while not s2_matches[k]:
            k += 1
        if s1[i] != s2[k]:
            t += 1
        k += 1
        
    t /= 2
    jaro = (matches / len1 + matches / len2 + (matches - t) / matches) / 3
    
    prefix = 0
    for i in range(min(4, len1, len2)):
        if s1[i] == s2[i]:
            prefix += 1
        else:
            break
            
    return jaro + prefix * 0.1 * (1 - jaro)

if __name__ == "__main__":
    pairs = [
        ("kitten", "sitting"),
        ("saturday", "sunday"),
        ("dixon", "dicksonx"),
        ("martha", "marhta")
    ]
    print("String Similarity Metrics:")
    for s1, s2 in pairs:
        lev = levenshtein_distance(s1, s2)
        jw = jaro_winkler(s1, s2)
        print(f"  '{s1}' vs '{s2}': Levenshtein={lev}, Jaro-Winkler={jw:.4f}")
    print("Test passed:", levenshtein_distance("kitten", "sitting") == 3)
