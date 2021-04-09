import { Model } from 'sequelize';

export class User extends Model {
	public id!: number; // Note that the `null assertion` `!` is required in strict mode.
	public nonce!: number;
	public publicAddress!: string;
	public claimed?: number;

	public nearPublicKey?: string;
	public refUserId? : number;
	public totalAffiliates? :number;
	public claimedAffiliates? :number;
}
