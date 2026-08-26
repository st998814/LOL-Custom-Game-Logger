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
}
export type {LinkUserResult , UserLinked};