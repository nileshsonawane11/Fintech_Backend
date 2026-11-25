Place your RSA public key file here as `public.pem`.

The public.pem file should be in PEM format:
-----BEGIN PUBLIC KEY-----
<base64-encoded RSA public key>
-----END PUBLIC KEY-----

This key is used by Spring Security OAuth2 Resource Server to validate incoming JWT Bearer tokens.
Generate a key pair using:
  openssl genrsa -out private.pem 2048
  openssl rsa -in private.pem -pubout -out public.pem

Keep private.pem secure and never commit it to source control.
Only public.pem belongs in this directory.
