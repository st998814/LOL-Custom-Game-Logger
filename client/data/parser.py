"""
Module Name: parser

Description:
    Data filtering and converting from fetched raw data
Responsibilities:
    - Filter data
    - Pack for sending

Author: Steven
Created: 2026-01-17
"""

from dataclasses import dataclass , asdict



@dataclass
class BasicInfo:
    game_id : int 
    game_duration : int
    game_creation_date : str

@dataclass
class Player:
    participant_id: int          
    team_id: int                 

    puuid: str | None            
    game_name: str | None
    tag_line: str | None

    champion_id: int

    first_blood: bool
    first_tower: bool
    total_cs: int
    # surrendered: bool

# data for a single match row in db 



    


    

# filter out the data we want 
class Filter : 
    
    def __init__(self , data : dict ):
        self.data = data 
        


    def get_basic_info(self)->BasicInfo:

        game_id = self.data["gameId"]

        game_duration = self.data["gameDuration"]

        game_creation_date = self.data["gameCreationDate"]

        return asdict(BasicInfo(game_id = game_id , game_duration = game_duration , game_creation_date = game_creation_date))
    
    def get_players_info(self) -> list[Player] :

        num_of_player  = len(self.data["participants"]) # should be 2 anyway

        players = []

        for i in range(0,num_of_player):

            participant_id = self.data["participants"][i]["participantId"]
            team_id = self.data["participants"][i]["teamId"]
            puuid = self.data["participantIdentities"][i]["player"]["puuid"]
            game_name = self.data["participantIdentities"][i]["player"]["gameName"]
            tag_line = self.data["participantIdentities"][i]["player"]["tagLine"]
            champion_id = self.data["participants"][i]["championId"]
            first_blood = self.data["participants"][i]["stats"]["firstBloodKill"]
            first_tower = self.data["participants"][i]["stats"]["firstTowerKill"]
            total_cs = self.data["participants"][i]["stats"]["totalMinionsKilled"] 
            # surrendered = self.data["teams"][i]["isSurrendered"]

            # write in the player entity 
            players.append(asdict(Player(participant_id = participant_id , team_id = team_id , 
                                puuid =puuid , game_name = game_name ,tag_line = tag_line , 
                                champion_id = champion_id , first_blood = first_blood
                                ,first_tower = first_tower,total_cs = total_cs )))
            


        return players

 

# pack up the data as payload , ready for sending

class Packer:
   
    def __init__(self,data):
        self.filter = Filter(data) # filltered data 
        self.payload = {"match": None , "players" : None , "event_type": None}

    def pack(self) -> dict:
        
       info , players =  self.filter.get_basic_info(), self.filter.get_players_info()
       self.payload["match"] = info
       self.payload["players"] = players
       self.payload["event_type"] = "SNAPSHOT"

       return self.payload
        

    









    






    










