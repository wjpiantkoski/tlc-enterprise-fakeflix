import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { PrismaService } from '@src/prisma.service';
import fs from 'fs';
import request from 'supertest';

describe('VideoController (e2e)', () => {
  let module: TestingModule;
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    prismaService = app.get(PrismaService);
  });

  beforeEach(() => {
    jest
      .useFakeTimers({ advanceTimers: true })
      .setSystemTime(new Date('2026-01-01'));
  });

  afterEach(async () => {
    await prismaService.video.deleteMany();
  });

  afterAll(async () => {
    await module.close();
    fs.rmSync('uploads', { recursive: true, force: true });
  });

  describe('/video (POST)', () => {
    it('should upload a video', async () => {
      const video = {
        title: 'Test Video',
        description: 'Test Description',
        videoUrl: 'uploads/video.mp4',
        thumbnailUrl: 'uploads/thumbnail.jpg',
        sizeInKb: 1000,
        duration: 100,
      };

      await request(app.getHttpServer())
        .post('/video')
        .attach('video', './test/fixtures/sample.mp4')
        .attach('thumbnail', './test/fixtures/sample.jpg')
        .field('title', video.title)
        .field('description', video.description)
        .expect(HttpStatus.CREATED)
        .expect((response) => {
          expect(response.body).toMatchObject({
            title: video.title,
            description: video.description,
            url: expect.stringContaining('mp4') as string,
            thumbnailUrl: expect.stringContaining('jpg') as string,
            sizeInKb: video.sizeInKb,
            duration: video.duration,
          });
        });
    });
  });
});
