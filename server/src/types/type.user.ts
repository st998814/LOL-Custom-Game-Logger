type LinkUserResult =
    | {
        status: "pending";

        link: string;

    }
    | {

        status: "already_linked";

        tgId: number | null;

    };

type UserLinked = {
    puuid : string
    tgId : number
    gameName : string | boolean

}
export type {LinkUserResult , UserLinked};