Place the RSA public key file here as `public.pem`.

Copy from the project root:
  Fin_project/keys/public.pem  →  payment-service/src/main/resources/keys/public.pem

PowerShell:
  Copy-Item "C:\Users\krush\OneDrive\Desktop\Fin_project\keys\public.pem" `
            "C:\Users\krush\OneDrive\Desktop\Fin_project\payment-service\src\main\resources\keys\"
