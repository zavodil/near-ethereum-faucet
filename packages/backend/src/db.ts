import os from 'os';
import path from 'path';
import { INTEGER, Sequelize, STRING } from 'sequelize';

import { User } from './models';

const sequelize = new Sequelize('near-faucet', '', undefined, {
	dialect: 'sqlite',
	storage: path.join(os.tmpdir(), 'db.sqlite'),
	logging: false,
});

// Init all models
User.init(
	{
		nonce: {
			allowNull: false,
			type: INTEGER, // SQLITE will use INTEGER
			defaultValue: (): number => Math.floor(Math.random() * 10000), // Initialize with a random nonce
		},
		publicAddress: {
			allowNull: false,
			type: STRING,
			unique: true,
			validate: { isLowercase: true },
		},
		nearPublicKey: {
			type: STRING,
			unique: false,
			defaultValue: "",
		},
		claimed: {
			type: INTEGER,
			unique: false,
			defaultValue: 0
		},
		refUserId: {
			type: INTEGER,
			unique: false,
			defaultValue: 0
		},
		totalAffiliates: {
			type: INTEGER,
			unique: false,
			defaultValue: 0
		},
		claimedAffiliates: {
			type: INTEGER,
			unique: false,
			defaultValue: 0
		}
	},
	{
		modelName: 'user',
		sequelize, // This bit is important
		timestamps: false,
	}
);

// Create new tables
sequelize.sync({alter: true});

export { sequelize };
