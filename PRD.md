# StackWatch PRD (Product Requirements Document)

## 1. 개요
StackWatch는 스택 기반의 시간 관리 및 작업 스케줄링 서비스입니다. 사용자는 작업을 스택에 추가하고, 가장 최근에 추가된 작업부터 순차적으로 처리할 수 있습니다. 본 서비스는 황장호 님(Jang-Ho Hwang)의 스택 기반 시간 관리 아이디어를 바탕으로 설계되었습니다.

## 2. 목표
- 사용자가 작업을 스택에 추가(Push)할 수 있다.
- 사용자가 가장 최근 작업을 완료(Pop)할 수 있다.
- 현재 스택에 쌓인 작업 목록을 확인할 수 있다.
- 각 작업별로 진행 시간(타이머)을 자동으로 측정한다.
- 작업 전환 시 타이머와 컨텍스트가 자동으로 관리된다.
- 마감기한 대신 누적 시간 기반의 압박감을 제공한다.
- 직관적이고 간단한 인터페이스 제공

## 3. 주요 기능
1. **작업 추가(Push)**
    - 사용자는 새로운 작업을 입력하여 스택에 추가할 수 있다.
    - 새 작업을 시작하면 타이머가 00:00:00으로 리셋되고, 컨텍스트 메모장이 비워진다.
2. **작업 완료(Pop)**
    - 사용자는 가장 최근에 추가된 작업을 완료 처리(스택에서 제거)할 수 있다.
    - 이전 작업으로 자동 전환되며, 해당 작업의 타이머와 컨텍스트가 복원된다.
3. **작업 목록 조회**
    - 현재 스택에 쌓여 있는 모든 작업을 확인할 수 있다.
    - 각 작업별 누적 시간과 컨텍스트를 확인할 수 있다.
4. **타이머 관리**
    - 각 작업별로 타이머가 자동으로 증가한다(멈추지 않음).
    - 작업 전환 시 타이머와 컨텍스트가 자동으로 저장/복원된다.
    - Idle(휴식) 작업은 예외적으로, 전환 시 타이머가 리셋된다.
5. **컨텍스트 메모장**
    - 각 작업별로 자유롭게 메모를 남길 수 있다.
    - 작업 전환 시 해당 작업의 메모가 자동으로 복원된다.

## 4. 사용자 시나리오
- 사용자는 오늘 해야 할 일을 입력하여 스택에 쌓는다.
- 작업을 진행하며 컨텍스트 메모장에 관련 정보를 자유롭게 기록한다.
- 작업을 완료하지 못한 채 다른 일을 해야 할 경우, 새 작업을 추가(Push)한다. 타이머와 메모장이 리셋된다.
- 새 작업이 끝나면 Pop하여 이전 작업으로 돌아가고, 타이머와 메모장이 복원된다.
- Idle(휴식) 작업으로 전환하면 타이머가 리셋되고, 휴식 시간도 기록된다.
- 언제든지 남은 작업 목록과 각 작업별 누적 시간을 확인할 수 있다.

## 5. 비고
- 본 서비스는 스택(LIFO) 구조를 활용하여, 최근에 추가된 작업을 우선적으로 처리하는 시간 관리 방식을 지원한다.
- 마감기한 대신 누적 시간과 타이머를 통해 압박감을 제공하며, 실제로 소요된 총 시간을 투명하게 기록한다.
