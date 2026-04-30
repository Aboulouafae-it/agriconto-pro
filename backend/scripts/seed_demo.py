from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import (
    Crop,
    Customer,
    Document,
    Expense,
    Farm,
    FarmMember,
    Field,
    Sale,
    Supplier,
    User,
    Workday,
    WorkdayEntry,
    Worker,
    WorkerAdvance,
    WorkerPayment,
)
from app.models.domain import DocumentRequest
from app.models.enums import DocumentStatus, FarmMemberStatus, FarmRole, FiscalProfile

DEMO_EMAIL = "demo@example.com"
DEMO_PASSWORD = "Password123!"
DEMO_FARM_NAME = "Azienda Agricola Verde"


def seed_demo(db: Session) -> tuple[User, Farm]:
    user = ensure_demo_user(db)
    farm = ensure_demo_farm(db, user)
    ensure_demo_membership(db, user, farm)
    ensure_demo_business_data(db, user, farm)
    db.commit()
    return user, farm


def ensure_demo_user(db: Session) -> User:
    user = db.scalar(select(User).where(User.email == DEMO_EMAIL))
    password_hash = hash_password(DEMO_PASSWORD)
    if not user:
        user = User(
            email=DEMO_EMAIL,
            full_name="Mario Rossi",
            password_hash=password_hash,
            is_active=True,
        )
        db.add(user)
        db.flush()
        return user

    user.full_name = user.full_name or "Mario Rossi"
    user.password_hash = password_hash
    user.is_active = True
    db.flush()
    return user


def ensure_demo_farm(db: Session, user: User) -> Farm:
    farm = db.scalar(select(Farm).where(Farm.name == DEMO_FARM_NAME))
    if not farm:
        farm = Farm(
            name=DEMO_FARM_NAME,
            legal_name="Azienda Agricola Verde Societa Agricola",
            partita_iva="IT01234567890",
            codice_fiscale="RSSMRA80A01H501U",
            address="Via dei Campi 1",
            city="Bologna",
            province="BO",
            region="Emilia-Romagna",
            fiscal_profile=FiscalProfile.REGIME_SPECIALE_AGRICOLO,
            owner_id=user.id,
        )
        db.add(farm)
        db.flush()
        return farm

    farm.owner_id = user.id
    farm.legal_name = farm.legal_name or "Azienda Agricola Verde Societa Agricola"
    farm.fiscal_profile = farm.fiscal_profile or FiscalProfile.REGIME_SPECIALE_AGRICOLO
    db.flush()
    return farm


def ensure_demo_membership(db: Session, user: User, farm: Farm) -> FarmMember:
    membership = db.scalar(
        select(FarmMember).where(FarmMember.farm_id == farm.id, FarmMember.user_id == user.id)
    )
    if not membership:
        membership = FarmMember(
            farm_id=farm.id,
            user_id=user.id,
            role=FarmRole.OWNER,
            status=FarmMemberStatus.ACTIVE,
        )
        db.add(membership)
    else:
        membership.role = FarmRole.OWNER
        membership.status = FarmMemberStatus.ACTIVE
    db.flush()
    return membership


def ensure_demo_business_data(db: Session, user: User, farm: Farm) -> None:
    field = db.scalar(select(Field).where(Field.farm_id == farm.id, Field.name == "Campo Nord"))
    if not field:
        field = Field(
            name="Campo Nord",
            area_hectares=Decimal("3.5"),
            farm_id=farm.id,
            created_by_id=user.id,
        )
        db.add(field)
        db.flush()

    field_south = db.scalar(select(Field).where(Field.farm_id == farm.id, Field.name == "Campo Sud"))
    if not field_south:
        field_south = Field(
            name="Campo Sud",
            cadastral_reference="Foglio 12 / Particella 46",
            area_hectares=Decimal("2.1"),
            farm_id=farm.id,
            created_by_id=user.id,
        )
        db.add(field_south)
        db.flush()

    worker = db.scalar(
        select(Worker).where(
            Worker.farm_id == farm.id,
            Worker.first_name == "Luigi",
            Worker.last_name == "Bianchi",
        )
    )
    if not worker:
        worker = Worker(
            first_name="Luigi",
            last_name="Bianchi",
            fiscal_code="BNC LGU 80A01 H501U".replace(" ", ""),
            hourly_rate=Decimal("12.50"),
            farm_id=farm.id,
            created_by_id=user.id,
        )
        db.add(worker)
        db.flush()

    worker_two = db.scalar(
        select(Worker).where(
            Worker.farm_id == farm.id,
            Worker.first_name == "Anna",
            Worker.last_name == "Verdi",
        )
    )
    if not worker_two:
        worker_two = Worker(
            first_name="Anna",
            last_name="Verdi",
            fiscal_code=None,
            contract_type="Stagionale",
            hourly_rate=Decimal("11.80"),
            farm_id=farm.id,
            created_by_id=user.id,
        )
        db.add(worker_two)
        db.flush()

    supplier = db.scalar(select(Supplier).where(Supplier.farm_id == farm.id, Supplier.name == "Consorzio Agrario"))
    if not supplier:
        supplier = Supplier(
            name="Consorzio Agrario",
            vat_number="IT09876543210",
            farm_id=farm.id,
            created_by_id=user.id,
        )
        db.add(supplier)
        db.flush()

    customer = db.scalar(select(Customer).where(Customer.farm_id == farm.id, Customer.name == "Mercato Ortofrutticolo"))
    if not customer:
        customer = Customer(
            name="Mercato Ortofrutticolo",
            farm_id=farm.id,
            created_by_id=user.id,
        )
        db.add(customer)
        db.flush()

    crop = db.scalar(select(Crop).where(Crop.farm_id == farm.id, Crop.name == "Pomodoro"))
    if not crop:
        crop = Crop(
            name="Pomodoro",
            season="2026",
            field_id=field.id,
            farm_id=farm.id,
            created_by_id=user.id,
        )
        db.add(crop)
        db.flush()

    crop_two = db.scalar(select(Crop).where(Crop.farm_id == farm.id, Crop.name == "Zucchina"))
    if not crop_two:
        crop_two = Crop(
            name="Zucchina",
            season="Primavera 2026",
            field_id=field_south.id,
            farm_id=farm.id,
            created_by_id=user.id,
        )
        db.add(crop_two)
        db.flush()

    workday = db.scalar(select(Workday).where(Workday.farm_id == farm.id, Workday.description == "Raccolta demo"))
    if not workday:
        workday = Workday(
            work_date=date.today(),
            description="Raccolta demo",
            farm_id=farm.id,
            created_by_id=user.id,
        )
        db.add(workday)
        db.flush()
        db.add(
            WorkdayEntry(
                workday_id=workday.id,
                worker_id=worker.id,
                crop_id=crop.id,
                hours=Decimal("6.5"),
                hourly_rate=Decimal("12.50"),
                activity="Raccolta",
                farm_id=farm.id,
                created_by_id=user.id,
            )
        )
        db.add(
            WorkdayEntry(
                workday_id=workday.id,
                worker_id=worker_two.id,
                crop_id=crop.id,
                hours=Decimal("5.5"),
                hourly_rate=Decimal("11.80"),
                activity="Selezione cassette",
                farm_id=farm.id,
                created_by_id=user.id,
            )
        )

    if not db.scalar(select(WorkerAdvance).where(WorkerAdvance.farm_id == farm.id, WorkerAdvance.worker_id == worker.id)):
        db.add(
            WorkerAdvance(
                worker_id=worker.id,
                advance_date=date.today(),
                amount=Decimal("50.00"),
                farm_id=farm.id,
                created_by_id=user.id,
            )
        )

    if not db.scalar(select(WorkerPayment).where(WorkerPayment.farm_id == farm.id, WorkerPayment.worker_id == worker.id)):
        db.add(
            WorkerPayment(
                worker_id=worker.id,
                payment_date=date.today(),
                amount=Decimal("81.25"),
                farm_id=farm.id,
                created_by_id=user.id,
            )
        )

    if not db.scalar(select(Expense).where(Expense.farm_id == farm.id, Expense.description == "Acquisto sementi demo")):
        db.add(
            Expense(
                expense_date=date.today(),
                supplier_id=supplier.id,
                crop_id=crop.id,
                category="Sementi",
                amount=Decimal("180.00"),
                description="Acquisto sementi demo",
                farm_id=farm.id,
                created_by_id=user.id,
            )
        )

    if not db.scalar(select(Expense).where(Expense.farm_id == farm.id, Expense.description == "Gasolio agricolo demo")):
        db.add(
            Expense(
                expense_date=date.today(),
                supplier_id=supplier.id,
                crop_id=crop_two.id,
                category="Carburante",
                amount=Decimal("95.00"),
                description="Gasolio agricolo demo",
                farm_id=farm.id,
                created_by_id=user.id,
            )
        )

    if not db.scalar(select(Sale).where(Sale.farm_id == farm.id, Sale.description == "Vendita pomodori demo")):
        db.add(
            Sale(
                sale_date=date.today(),
                customer_id=customer.id,
                crop_id=crop.id,
                amount=Decimal("450.00"),
                description="Vendita pomodori demo",
                farm_id=farm.id,
                created_by_id=user.id,
            )
        )

    if not db.scalar(select(DocumentRequest).where(DocumentRequest.farm_id == farm.id, DocumentRequest.title == "Fattura sementi")):
        db.add(
            DocumentRequest(
                title="Fattura sementi",
                requested_from="Consorzio Agrario",
                due_date=date.today(),
                status=DocumentStatus.REQUESTED,
                farm_id=farm.id,
                created_by_id=user.id,
            )
        )
    if not db.scalar(select(Document).where(Document.farm_id == farm.id, Document.title == "Contratto lavoratore Luigi Bianchi")):
        db.add(
            Document(
                title="Contratto lavoratore Luigi Bianchi",
                document_type="Contratto lavoratore",
                original_file_name="contratto-luigi-bianchi.pdf",
                stored_file_name="demo-contratto-luigi-bianchi.pdf",
                storage_key="demo/documents/contratto-luigi-bianchi.pdf",
                mime_type="application/pdf",
                size_bytes=128000,
                uploaded_by=user.id,
                uploaded_at=datetime.now(timezone.utc),
                status=DocumentStatus.RECEIVED,
                related_entity_type="worker",
                related_entity_id=worker.id,
                notes="Documento demo per indice documenti.",
                farm_id=farm.id,
                created_by_id=user.id,
            )
        )
    db.flush()


def main() -> None:
    db = SessionLocal()
    try:
        seed_demo(db)
        print(f"Seed demo completato: {DEMO_EMAIL} / {DEMO_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
