import express from 'express';
import jwt from 'express-jwt';

import * as controller from './controller';
import { config } from '../../config';

export const claimRouter = express.Router();

claimRouter.route('/:userId/reward').get(jwt(config), controller.claimAffiliateReward);

claimRouter.route('/:userId/refLinkAvailability').get(jwt(config), controller.getRefLinkAvailability);

/** GET /api/claim/:userId/:publicKey */
claimRouter.route('/:userId/:publicKey').patch(jwt(config), controller.patch);

/** GET /api/claim/:userId/:publicKey/:refUserId */
claimRouter.route('/:userId/:publicKey/:refUserId').patch(jwt(config), controller.patch);


