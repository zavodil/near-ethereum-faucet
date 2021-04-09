import express from 'express';
import jwt from 'express-jwt';

import * as controller from './controller';
import { config } from '../../config';

export const claimRouter = express.Router();

claimRouter.route('/:userId/refLink').get(jwt(config), controller.getRefLink);

claimRouter.route('/:userId/refInfo').get(jwt(config), controller.getRefInfo);

/** GET /api/claim/:userId/:publicKey */
claimRouter.route('/:userId/:publicKey').patch(jwt(config), controller.patch);

/** GET /api/claim/:userId/:publicKey/:refUserId */
claimRouter.route('/:userId/:publicKey/:refUserId').patch(jwt(config), controller.patch);


