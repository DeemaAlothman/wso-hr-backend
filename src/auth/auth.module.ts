import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    ActivityLogsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.getOrThrow<string>('JWT_ACCESS_SECRET');
        const expiresIn = config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';

        return {
          secret,
          signOptions: { expiresIn: expiresIn as any }, // ✅ يحل مشكلة النوع في Nest 11
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
})
export class AuthModule {}
