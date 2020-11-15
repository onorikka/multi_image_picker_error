# example of how to do the auth_sign for a Rails app

# model
# -*- encoding : utf-8 -*-
class AuthSign
  require 'base64'
  require 'hmac-sha1'

