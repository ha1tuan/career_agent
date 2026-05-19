
class CareerAgentException(Exception):
    """Base exception cho toàn bộ app"""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class NotFoundException(CareerAgentException):
    def __init__(self, resource: str):
        super().__init__(f"{resource} không tìm thấy", status_code=404)


class UnauthorizedException(CareerAgentException):
    def __init__(self):
        super().__init__("Không có quyền truy cập", status_code=401)


class ValidationException(CareerAgentException):
    def __init__(self, message: str):
        super().__init__(message, status_code=422)


class CVDuplicateException(CareerAgentException):
    def __init__(self, existing_cv):
        self.existing_cv = existing_cv
        super().__init__(message="CV đã tồn tại", status_code=409)