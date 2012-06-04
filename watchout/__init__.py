import datetime
import iso8601
from flask import Flask, request, render_template, url_for, redirect
from redis import StrictRedis


class UTC(datetime.tzinfo):
    def utcoffset(self, dt):
        return datetime.timedelta(0)

    def dst(self, dt):
        return datetime.timedelta(0)

    def tzname(self, dt):
        return 'UTC'

utc = UTC()


app = Flask(__name__)
conn = StrictRedis()


@app.route('/')
def index():
    now = datetime.datetime.utcnow().replace(tzinfo=utc)
    stack_keys = conn.lrange('stack', 0, -1)
    stack = []
    for key in stack_keys:
        created_at = iso8601.parse_date(key[6:])
        stack.append({'title': conn.get(key + '/title'),
                      'context': conn.get(key + '/context'),
                      'created_at': created_at,
                      'elapsed': now - created_at})
    stack_top = None
    if stack:
        stack_top = stack.pop(0)
    return render_template('index.html', now=now, stack=stack, top=stack_top)


@app.route('/tasks/add')
def form_add_task():
    return render_template('add_task.html')


@app.route('/tasks', methods=['POST'])
def add_task():
    title = request.form['title']
    context = request.form.get('context', u'')
    now = datetime.datetime.utcnow()
    key = 'tasks/{0}'.format(now.isoformat())
    conn.set(key + '/title', title)
    conn.set(key + '/context', context)
    conn.lpush('stack', key)
    conn.rpush('archive', key)
    return redirect(url_for('index'))


@app.route('/tasks/')
def edit_task(id):
    pass
