# example for google app engine

import webapp2

# needed to sign S3 policy
import datetime
import hashlib
import hmac

# get AWS details from somewhere...
# from foo import YOUR_AWS_SECRET_KEY
# from foo