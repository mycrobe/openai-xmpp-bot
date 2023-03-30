import slixmpp
import openai
from dotenv import load_dotenv
import os

load_dotenv()

class OpenAIBot(slixmpp.ClientXMPP):

    def __init__(self):
        jid = os.environ.get('JID')
        password = os.environ.get('PASSWORD')
        openai.api_key = os.environ.get('OPENAI_API_KEY')
        self.model = os.environ.get('MODEL')
        super().__init__(jid, password)
        self.add_event_handler("session_start", self.start)
        self.add_event_handler("message", self.message)
        self.messages = {}


    def start(self, _):
        self.send_presence()
        self.get_roster()


    def generate_text(self, prompt, sender):
        messages = self.get_messages(sender)
        messages.append({"role": "user", "content": prompt})
        response = openai.ChatCompletion.create(
            model=self.model,
            messages=messages,
            temperature=0.5
        )
        message = response['choices'][0]['message']
        messages.append(message)
        self.send_message(mto=sender, mbody=message['content'])
     
     
    def get_messages(self, user):
        if not self.messages.get(user):
            self.reset_messages(user)
        
        return self.messages[user]
    
    
    def reset_messages(self, user):
        self.messages[user] = [{"role": "system", "content": "You are a helpful assistant."}]
    
    
    def message(self, msg):
        if msg['type'] in ('chat', 'normal'):
            prompt = msg['body']
            sender = msg['from']
            
            if prompt == 'reset':
                self.reset_messages(sender)
                self.send_message(mto=sender, mbody='All is forgotten!')
            
            else:
                self.generate_text(prompt, sender)


if __name__ == '__main__':
    bot = OpenAIBot()
    bot.connect()
    bot.process(forever=False)
