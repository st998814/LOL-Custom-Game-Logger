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

}
export type {LinkUserResult , UserLinked};