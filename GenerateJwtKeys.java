
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.util.Base64;

public class GenerateJwtKeys {

    public static void main(String[] args) throws Exception {

        Path keysDirectory = Path.of("keys");
        Files.createDirectories(keysDirectory);

        // Generate a 2048-bit RSA key pair
        KeyPairGenerator generator =
                KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);

        KeyPair keyPair = generator.generateKeyPair();

        // Encode private and public keys in PEM format
        String privatePem = toPem(
                "PRIVATE KEY",
                keyPair.getPrivate().getEncoded()
        );

        String publicPem = toPem(
                "PUBLIC KEY",
                keyPair.getPublic().getEncoded()
        );

        Path privatePath = keysDirectory.resolve("private.pem");
        Path publicPath = keysDirectory.resolve("public.pem");

        // Do not overwrite existing keys accidentally
        if (Files.exists(privatePath) || Files.exists(publicPath)) {
            throw new IllegalStateException(
                    "Keys already exist. Back them up before replacing."
            );
        }

        Files.writeString(
                privatePath,
                privatePem,
                StandardOpenOption.CREATE_NEW
        );

        Files.writeString(
                publicPath,
                publicPem,
                StandardOpenOption.CREATE_NEW
        );

        System.out.println("RSA key pair generated successfully.");
        System.out.println("Private key: " + privatePath.toAbsolutePath());
        System.out.println("Public key:  " + publicPath.toAbsolutePath());
    }

    private static String toPem(String type, byte[] encoded) {
        String base64 = Base64.getMimeEncoder(
                64, new byte[]{'\n'}
        ).encodeToString(encoded);

        return "-----BEGIN " + type + "-----\n"
                + base64 + "\n"
                + "-----END " + type + "-----\n";
    }
}