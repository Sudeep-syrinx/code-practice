import statistics


def letter_grade(score):
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    if score >= 60:
        return "D"
    return "F"


class Student:
    def __init__(self, name):
        self.name = name
        self.scores = {}

    def add_score(self, subject, score):
        if not 0 <= score <= 100:
            raise ValueError("Score must be between 0 and 100")
        self.scores[subject] = score

    def average(self):
        if not self.scores:
            return 0.0
        return round(sum(self.scores.values()) / len(self.scores), 2)

    def best_subject(self):
        if not self.scores:
            return None
        return max(self.scores, key=self.scores.get)

    def weakest_subject(self):
        if not self.scores:
            return None
        return min(self.scores, key=self.scores.get)

    def grade(self):
        return letter_grade(self.average())


class Classroom:
    def __init__(self, name):
        self.name = name
        self.students = []

    def add_student(self, student):
        self.students.append(student)

    def ranking(self):
        return sorted(self.students, key=lambda s: s.average(), reverse=True)

    def subject_scores(self, subject):
        return [s.scores[subject] for s in self.students if subject in s.scores]

    def subject_stats(self, subject):
        scores = self.subject_scores(subject)
        if not scores:
            return {}
        return {
            "mean": round(statistics.mean(scores), 2),
            "median": statistics.median(scores),
            "highest": max(scores),
            "lowest": min(scores),
            "stdev": round(statistics.pstdev(scores), 2),
        }

    def grade_distribution(self):
        dist = {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0}
        for s in self.students:
            dist[s.grade()] += 1
        return dist

    def print_report(self):
        print(f"Report for {self.name}")
        print("-" * 46)
        print(f"{'Rank':<6}{'Name':<12}{'Average':<10}{'Grade':<7}{'Best':<10}")
        for rank, s in enumerate(self.ranking(), start=1):
            print(f"{rank:<6}{s.name:<12}{s.average():<10}{s.grade():<7}{s.best_subject():<10}")


if __name__ == "__main__":
    room = Classroom("Class 10-A")
    data = {
        "Sudeep": {"Math": 92, "Science": 88, "English": 79},
        "Ravi": {"Math": 75, "Science": 82, "English": 91},
        "Anita": {"Math": 98, "Science": 95, "English": 94},
        "Kiran": {"Math": 55, "Science": 62, "English": 58},
        "Meena": {"Math": 81, "Science": 77, "English": 85},
    }
    for name, subjects in data.items():
        student = Student(name)
        for subject, score in subjects.items():
            student.add_score(subject, score)
        room.add_student(student)

    room.print_report()
    print()
    print("Math stats   :", room.subject_stats("Math"))
    print("Science stats:", room.subject_stats("Science"))
    print("Distribution :", room.grade_distribution())
    print("Weakest (Kiran):", room.students[3].weakest_subject())

    try:
        room.students[0].add_score("Art", 150)
    except ValueError as e:
        print("Error:", e)
