"""案例注册表。"""

from typing import Dict, List

from app.cases.base import BaseCase
from app.core.exceptions import NotFoundError
from app.schemas.case import CaseMeta


class CaseRegistry:
    def __init__(self) -> None:
        self._items: Dict[str, BaseCase] = {}

    def register(self, case: BaseCase) -> None:
        if case.meta.id in self._items:
            raise ValueError(f"案例标识重复: {case.meta.id}")
        self._items[case.meta.id] = case

    def list_meta(self) -> List[CaseMeta]:
        return [item.meta for item in self._items.values()]

    def list_by_chapter(self, chapter: str) -> List[CaseMeta]:
        return [item.meta for item in self._items.values() if item.meta.chapter == chapter]

    def get(self, case_id: str) -> BaseCase:
        case = self._items.get(case_id)
        if case is None:
            raise NotFoundError(f"案例未注册: {case_id}")
        return case


case_registry = CaseRegistry()
