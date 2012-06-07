import datetime


class UTC(datetime.tzinfo):
    def utcoffset(self, dt):
        return datetime.timedelta(0)

    def dst(self, dt):
        return datetime.timedelta(0)

    def tzname(self, dt):
        return 'UTC'

utc = UTC()


def utcnow():
    return datetime.datetime.utcnow().replace(tzinfo=utc)
