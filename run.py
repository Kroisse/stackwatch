import os.path
from watchout import app

cfg_filepath = os.path.abspath(os.path.join(os.path.dirname(__file__),
                                            'default.cfg'))
app.config.from_pyfile(cfg_filepath)
app.run(debug=True)
