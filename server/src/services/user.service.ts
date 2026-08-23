import type {
    UserRegister

} from '../types/type.user.js';

async function registerUser(tgId:string,req:Request):Promise<UserRegister | null> {
    
}

async function linkUser(tgId:string | null, playerId : number | null) {

   
}

export {registerUser,linkUser};