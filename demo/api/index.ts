import { ApiService } from '../../src/ApiService';

const apiServer = new ApiService(55556);
apiServer.start();
