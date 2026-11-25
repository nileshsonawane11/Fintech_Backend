This directory should contain the RSA public key file named `public.pem`.

The public key must be in PEM format:

-----BEGIN PUBLIC KEY-----
<Base64-encoded RSA public key>
-----END PUBLIC KEY-----

This key is used to verify JWT tokens issued by the auth-service.
Copy the public.pem from the auth-service keys directory into this location before running the service.
