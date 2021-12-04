import requests

APPLICATION_ID = 154
BOT_TOKEN = "154"

url = "https://discord.com/api/v8/applications/{}/commands".format(APPLICATION_ID)


# This is an example CHAT_INPUT or Slash Command, with a type of 1
json = {
    "name": "dldialogue",
    "type": 1,
    "description": "Create a Dragalia Lost themed dialogue",
    "options": [
        {
            "name": "name",
            "description": "The name of the character",
            "type": 3,
            "required": True
        },
        {
            "name": "message",
            "description": "What should the character say",
            "type": 3,
            "required": True
        },
    ]
}

# For authorization, you can use either your bot token
headers = {
    "Authorization": "Bot {}".format(BOT_TOKEN)
}

r = requests.post(url, headers=headers, json=json)