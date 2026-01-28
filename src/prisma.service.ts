import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    // connects to db when service is initialized
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
