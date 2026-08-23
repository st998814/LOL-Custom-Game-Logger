import type {
    UserRegister

} from '../types/type.user.js';
async function registerUser(tgId:string,req:Request):Promise<UserRegister | null> {
    
    // get user playerID by tgid

        // if  get :

            //  return registrer already

        // if not :

            // TODO: (suppose here we can get user's player id ,
            // if the requeest body has it)

            // if payer_id present in body 
                // link(insert) puuid for that row
            // if not:
                // complete new user , lodge it's puuid(new row) 

}


export {registerUser};