class BaseError(Exception):

    def __int__(self , message):
        self.message = message
 
class UserNotFoundError(BaseException):
    pass

class HttpRequestError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


class UnknownCommandError(Exception):
    pass