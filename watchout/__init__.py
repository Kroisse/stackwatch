from flask import Flask, render_template
from redis import StrictRedis


app = Flask(__name__)
conn = StrictRedis()


@app.route('/')
def index():
    return render_template('index.html')
