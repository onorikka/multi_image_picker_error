# example of how to do the auth_sign for a Rails app

# model
# -*- encoding : utf-8 -*-
class AuthSign
  require 'base64'
  require 'hmac-sha1'

  def self.sign_data(details_to_sign)
    hmac = HMAC::SHA1.new(YOUR_