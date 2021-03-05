import express from 'express';
import jwt from 'express-jwt';

import * as controller from './controller';
import { config } from '../../config';

export const claimRouter = express.Router();

/** GET /api/claim/:userId/:publicKey */
claimRouter.route('/:userId/:publicKey').patch(jwt(config), controller.patch);
