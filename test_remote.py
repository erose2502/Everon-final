import datetime
import json

class Event:
    def __init__(self, title, start_time, end_time):
        self.title = title
        self.start_time = start_time
        self.end_time = end_time

    def overlaps(self, other):
        return self.start_time < other.end_time and self.end_time > other.start_time

    def to_dict(self):
        return {
            "title": self.title,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat()
        }

class SchedulerAI:
    def __init__(self):
        self.events = []

    def add_event(self, title, start_time, end_time):
        new_event = Event(title, start_time, end_time)
        for event in self.events:
            if event.overlaps(new_event):
                return f"Conflict with event: {event.title} ({event.start_time} - {event.end_time})"
        self.events.append(new_event)
        return "Event added successfully!"

    def suggest_time(self, duration_minutes, after=None):
        after = after or datetime.datetime.now()
        possible_start = after
        self.events.sort(key=lambda e: e.start_time)
        for event in self.events:
            if possible_start + datetime.timedelta(minutes=duration_minutes) <= event.start_time:
                return possible_start
            possible_start = max(possible_start, event.end_time)
        return possible_start

    def list_events(self):
        return [event.to_dict() for event in sorted(self.events, key=lambda e: e.start_time)]

# Example usage:
if __name__ == "__main__":
    ai = SchedulerAI()
    now = datetime.datetime.now()
    print(ai.add_event("Team Meeting", now + datetime.timedelta(hours=1), now + datetime.timedelta(hours=2)))
    print(ai.add_event("Lunch", now + datetime.timedelta(hours=2), now + datetime.timedelta(hours=3)))
    print(ai.add_event("Call", now + datetime.timedelta(hours=1, minutes=30), now + datetime.timedelta(hours=2, minutes=30)))
    print("Events:", json.dumps(ai.list_events(), indent=2))
    suggested = ai.suggest_time(30)
    print("Suggested time for 30 min event:", suggested)