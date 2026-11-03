Place the RSA public key file here as `public.pem`.

Copy from the project root:
  Fin_project/keys/public.pem  →  card-service/src/main/resources/keys/public.pem

PowerShell:
  Copy-Item "C:\Users\krush\OneDrive\Desktop\Fin_project\keys\public.pem" `
            "C:\Users\krush\OneDrive\Desktop\Fin_project\card-service\src\main\resources\keys\"
