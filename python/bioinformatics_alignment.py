def needleman_wunsch(seq1, seq2, match_score=1, mismatch_score=-1, gap_penalty=-2):
    n, m = len(seq1), len(seq2)
    
    # Initialize the scoring matrix
    score_matrix = [[0 for _ in range(m + 1)] for _ in range(n + 1)]
    
    # Fill penalties for the first row and column
    for i in range(n + 1):
        score_matrix[i][0] = gap_penalty * i
    for j in range(m + 1):
        score_matrix[0][j] = gap_penalty * j
        
    # Matrix filling
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            match = score_matrix[i - 1][j - 1] + (match_score if seq1[i - 1] == seq2[j - 1] else mismatch_score)
            delete = score_matrix[i - 1][j] + gap_penalty
            insert = score_matrix[i][j - 1] + gap_penalty
            score_matrix[i][j] = max(match, delete, insert)
            
    # Traceback to build the alignment strings
    align1, align2 = "", ""
    i, j = n, m
    
    while i > 0 and j > 0:
        score_current = score_matrix[i][j]
        score_diagonal = score_matrix[i - 1][j - 1]
        score_up = score_matrix[i - 1][j]
        score_left = score_matrix[i][j - 1]
        
        if score_current == score_diagonal + (match_score if seq1[i - 1] == seq2[j - 1] else mismatch_score):
            align1 += seq1[i - 1]
            align2 += seq2[j - 1]
            i -= 1
            j -= 1
        elif score_current == score_up + gap_penalty:
            align1 += seq1[i - 1]
            align2 += "-"
            i -= 1
        elif score_current == score_left + gap_penalty:
            align1 += "-"
            align2 += seq2[j - 1]
            j -= 1

    # Finish any remaining edges
    while i > 0:
        align1 += seq1[i - 1]
        align2 += "-"
        i -= 1
    while j > 0:
        align1 += "-"
        align2 += seq2[j - 1]
        j -= 1

    return align1[::-1], align2[::-1], score_matrix[n][m]

if __name__ == "__main__":
    dna_seq1 = "GATTACA"
    dna_seq2 = "GCATGCU"
    
    print(f"Aligning Sequence 1: {dna_seq1}")
    print(f"Aligning Sequence 2: {dna_seq2}\n")
    
    aligned_1, aligned_2, final_score = needleman_wunsch(
        dna_seq1, dna_seq2, 
        match_score=1, mismatch_score=-1, gap_penalty=-1
    )
    
    print("Optimal Alignment:")
    print(aligned_1)
    # Generate match visualizer
    connections = "".join("|" if a == b else (" " if "-" in (a, b) else ".") for a, b in zip(aligned_1, aligned_2))
    print(connections)
    print(aligned_2)
    print(f"\nFinal Alignment Score: {final_score}")
