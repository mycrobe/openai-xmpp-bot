import aiohttp
import asyncio
import slixmpp

class MyBot(slixmpp.ClientXMPP):

    def __init__(self, jid, password):
        super().__init__(jid, password)
        self.add_event_handler("session_start", self.start)
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": "Bearer YOUR_API_KEY"
        }
        self.api_endpoint = "https://api.openai.com/v1/completions"
        self.paragraph_separator = "\n\n"

    def start(self, event):
        self.send_presence()
        self.get_roster()

    async def generate_text(self, prompt):
        async with aiohttp.ClientSession() as session:
            data = {
                "prompt": prompt,
                "temperature": 0.7,
                "stop": ["\n"]
            }
            async with session.post(self.api_endpoint, headers=self.headers, json=data) as response:
                response_json = await response.json()
                generated_text = response_json["choices"][0]["text"]
                paragraphs = generated_text.split(self.paragraph_separator)
                for paragraph in paragraphs:
                    yield paragraph.strip()

    async def send_paragraphs(self, msg, generator):
        chunks = []
        async for paragraph in generator:
            chunks.append(paragraph)
            if len("\n".join(chunks)) >= 500:
                self.send_message(mto=msg['from'], mbody="\n".join(chunks))
                chunks = []
        if len(chunks) > 0:
            self.send_message(mto=msg['from'], mbody="\n".join(chunks))

    def message(self, msg):
        if msg['type'] in ('chat', 'normal'):
            prompt = msg['body']
            loop = asyncio.get_event_loop()
            task = loop.create_task(self.generate_text(prompt))
            loop.create_task(self.send_paragraphs(msg, task))

if __name__ == '__main__':
    xmpp = MyBot("user@domain.com", "password")
    xmpp.connect()
    xmpp.process(forever=False)
