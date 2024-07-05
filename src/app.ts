import express from 'express';
import logger from 'morgan';
/**------------------------ */
import index from './routes/index';
import playerRoutes from './routes/players'; 
import friendRequest from './routes/friendRequest';
import pvpRoutes from './routes/pvpRouter';
import teamRoutes from './routes/teamRouter';
import rumbleRoutes from './routes/rumbleRouter';
import notificationRoute from './routes/notifications';
import refreshToken from './routes/tokenRefreshRouter';
import devTestRoute from './routes/devTester';
import main from './config/database';

// Initialize database
main();

const app = express();

//Middleware Setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(logger('dev'));

// Route setup
app.use('/', index);
app.use('/api', refreshToken);
app.use('/api', devTestRoute);
app.use('/api/friendRequests', friendRequest);
app.use(playerRoutes);
app.use(pvpRoutes);
app.use(teamRoutes);
app.use(rumbleRoutes);
app.use(notificationRoute);

export default app;