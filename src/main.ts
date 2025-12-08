import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // 1. Enable CORS (Critical for connecting to your Angular PWA later)
    app.enableCors({
        origin: "http://localhost:4200",
    });

    // 2. Enable Validation (Protect your data integrity)
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true, // Strips out properties that aren't in your DTOs
            forbidNonWhitelisted: true,
            transform: true,
        })
    );

    // 3. Setup Swagger Documentation (The "Invisible" Bonus)
    const config = new DocumentBuilder()
        .setTitle("HiveFund API")
        .setDescription(
            "The backend API for the HiveFund Financial Inclusion Platform"
        )
        .setVersion("1.0")
        .addTag("Auth")
        .addTag("Circles")
        .addTag("Payments")
        .addTag("Credit")
        .addTag("Loans")
        .addTag("Storefront")
        .addTag("Marketplace")
        .addTag("Learning")
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);

    await app.listen(process.env.PORT ?? 3000);
    console.log(
        `🚀 Application is running on: http://localhost:${process.env.PORT ?? 3000}`
    );
    console.log(
        `📚 Swagger documentation: http://localhost:${process.env.PORT ?? 3000}/api/docs`
    );
}
bootstrap();
