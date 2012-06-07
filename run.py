import os.path
import random
import string
from stackwatch import app


def filepath(*args):
    base_dir = os.path.dirname(__file__)
    return os.path.abspath(os.path.join(base_dir, *args))


def make_secret_key(length):
    chars = string.digits + string.ascii_letters
    return ''.join(random.choice(chars) for _ in xrange(length))


cfg_filepath = filepath('default.cfg')
local_cfg = filepath('local.cfg')
if not os.path.exists(local_cfg):
    with open(local_cfg, 'w') as f:
        secret_key = make_secret_key(64)
        print >> f, "SECRET_KEY = '{0}'".format(secret_key)
app.config.from_pyfile(cfg_filepath)
app.config.from_pyfile(local_cfg)
app.run(debug=True)
