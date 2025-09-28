// src/ping.controller.ts
import { Controller, Get, Redirect } from '@nestjs/common';

@Controller()
export class PingController {
  // GET /  -> will redirect to /api/ping if you setGlobalPrefix('api')
  @Get()
  @Redirect('ping', 302) // 👈 relative redirect, lets Nest add the global prefix
  root() {}

  // GET /ping  (becomes /api/ping when you use setGlobalPrefix('api'))
  @Get('ping')
  ping() {
    return { ok: true, time: new Date().toISOString() };
  }
}
// Note: You can test this controller by sending a GET request to the root path ("/")
// and it will redirect to "/ping", which responds with a JSON object containing the current time.