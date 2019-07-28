import dotenv from 'dotenv';
import { ApiService } from './ApiService';

dotenv.config();

const server = new ApiService(Number(process.env.PORT));
server.start();
