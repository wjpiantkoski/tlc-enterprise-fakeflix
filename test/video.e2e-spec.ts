import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Video } from '@prisma/client';
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

    it('should throw an error if video or thumbnail is not provided', async () => {
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
        .field('title', video.title)
        .field('description', video.description)
        .expect(HttpStatus.BAD_REQUEST)
        .expect({
          message: 'Both video and thumbnail are required',
          error: 'Bad Request',
          statusCode: HttpStatus.BAD_REQUEST,
        });
    });

    it('should not allow non mp4 video files', async () => {
      const video = {
        title: 'Test Video',
        description: 'Test Description',
        videoUrl: 'uploads/sample.mp3',
        thumbnailUrl: 'uploads/thumbnail.jpg',
        sizeInKb: 1000,
        duration: 100,
      };

      await request(app.getHttpServer())
        .post('/video')
        .attach('video', './test/fixtures/sample.mp3')
        .attach('thumbnail', './test/fixtures/sample.jpg')
        .field('title', video.title)
        .field('description', video.description)
        .expect(HttpStatus.BAD_REQUEST)
        .expect({
          message: 'Invalid file type. Only mp4 and jpeg files are allowed.',
          error: 'Bad Request',
          statusCode: HttpStatus.BAD_REQUEST,
        });
    });
  });

  describe('/streaming/:videoId (GET)', () => {
    it('should stream a video', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { body: sampleVideo }: { body: Video } = await request(
        app.getHttpServer(),
      )
        .post('/video')
        .attach('video', './test/fixtures/sample.mp4')
        .attach('thumbnail', './test/fixtures/sample.jpg')
        .field('title', 'Test Video')
        .field('description', 'Test Description');

      const fileSize = 1430145;
      const range = `bytes=0-${fileSize - 1}`;

      const response = await request(app.getHttpServer())
        .get(`/streaming/${sampleVideo.id}`)
        .set('Range', range)
        .expect(HttpStatus.PARTIAL_CONTENT);

      expect(response.headers['content-range']).toBe(
        `bytes 0-${fileSize - 1}/${fileSize}`,
      );
      expect(response.headers['accept-ranges']).toBe('bytes');
      expect(response.headers['content-length']).toBe(fileSize.toString());
      expect(response.headers['content-type']).toBe('video/mp4');
    });

    it('should return 404 if video is not found', async () => {
      await request(app.getHttpServer())
        .get('/streaming/123')
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
