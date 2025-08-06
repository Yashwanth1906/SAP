from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
import razorpay
import os
import json
import hmac
import hashlib
from db.connection import db_manager
from dotenv import load_dotenv

load_dotenv()

# Initialize Razorpay
client = razorpay.Client(auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET")))

router = APIRouter(prefix="/payments", tags=["Payments"])

class CreateOrderRequest(BaseModel):
    planId: str
    organizationId: int
    planName: str
    price: float

class VerifyPaymentRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str
    organizationId: int
    planId: str
    planName: str

class CreateSubscriptionRequest(BaseModel):
    organizationId: int
    planId: str
    planName: str
    price: float

@router.post("/create-order")
async def create_order(request: CreateOrderRequest):
    """Create a Razorpay order for one-time payment"""
    try:
        # Get organization details
        with db_manager.get_cursor() as cursor:
            cursor.execute("SELECT EMAIL, NAME FROM ORGANIZATIONS WHERE ID = ?", (request.organizationId,))
            org = cursor.fetchone()
            
            if not org:
                raise HTTPException(status_code=404, detail="Organization not found")
            
            email, name = org

        # Create Razorpay order
        order_data = {
            "amount": int(request.price * 100),  # Convert to paise
            "currency": "INR",
            "receipt": f"order_{request.organizationId}_{request.planId}",
            "notes": {
                "organization_id": str(request.organizationId),
                "plan_id": request.planId,
                "plan_name": request.planName,
                "organization_name": name
            }
        }
        
        order = client.order.create(data=order_data)
        
        return {
            "orderId": order["id"],
            "amount": order["amount"],
            "currency": order["currency"],
            "keyId": os.getenv("RAZORPAY_KEY_ID")
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")

@router.post("/create-subscription")
async def create_subscription(request: CreateSubscriptionRequest):
    """Create a Razorpay subscription for recurring payments"""
    try:
        # Get organization details
        with db_manager.get_cursor() as cursor:
            cursor.execute("SELECT EMAIL, NAME FROM ORGANIZATIONS WHERE ID = ?", (request.organizationId,))
            org = cursor.fetchone()
            
            if not org:
                raise HTTPException(status_code=404, detail="Organization not found")
            
            email, name = org

        # Create customer if not exists
        customer_data = {
            "name": name,
            "email": email,
            "contact": "9999999999"  # Default contact
        }
        
        customers = client.customer.all()
        customer = None
        
        for cust in customers["items"]:
            if cust["email"] == email:
                customer = cust
                break
        
        if not customer:
            customer = client.customer.create(data=customer_data)

        # Create plan
        plan_data = {
            "period": "monthly",
            "interval": 1,
            "item": {
                "name": f"BiasCertify {request.planName} Plan",
                "description": f"Premium subscription for {request.planName} plan",
                "amount": int(request.price * 100),
                "currency": "INR"
            }
        }
        
        plan = client.plan.create(data=plan_data)

        # Create subscription
        subscription_data = {
            "plan_id": plan["id"],
            "customer_notify": 1,
            "total_count": 12,  # 12 months
            "notes": {
                "organization_id": str(request.organizationId),
                "plan_id": request.planId,
                "plan_name": request.planName
            }
        }
        
        subscription = client.subscription.create(data=subscription_data)
        
        # Update organization with Razorpay customer ID
        with db_manager.get_cursor() as cursor:
            cursor.execute("""
                UPDATE ORGANIZATIONS 
                SET RAZORPAY_CUSTOMER_ID = ? 
                WHERE ID = ?
            """, (customer["id"], request.organizationId))

        return {
            "subscriptionId": subscription["id"],
            "customerId": customer["id"],
            "planId": plan["id"],
            "amount": int(request.price * 100),
            "currency": "INR",
            "keyId": os.getenv("RAZORPAY_KEY_ID")
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create subscription: {str(e)}")

@router.post("/verify-payment")
async def verify_payment(request: VerifyPaymentRequest):
    """Verify Razorpay payment signature and update premium status"""
    try:
        # Verify payment signature
        text = f"{request.razorpay_order_id}|{request.razorpay_payment_id}"
        signature = hmac.new(
            os.getenv("RAZORPAY_KEY_SECRET").encode(),
            text.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if signature != request.razorpay_signature:
            raise HTTPException(status_code=400, detail="Invalid payment signature")

        # Get payment details
        payment = client.payment.fetch(request.razorpay_payment_id)
        
        if payment["status"] != "captured":
            raise HTTPException(status_code=400, detail="Payment not captured")

        # Update organization to premium
        with db_manager.get_cursor() as cursor:
            cursor.execute("""
                UPDATE ORGANIZATIONS 
                SET ISPREMIUM = 1 
                WHERE ID = ?
            """, (request.organizationId,))

        return {
            "success": True,
            "message": "Payment verified and premium status activated",
            "paymentId": request.razorpay_payment_id,
            "orderId": request.razorpay_order_id
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment verification failed: {str(e)}")

@router.post("/webhook")
async def razorpay_webhook(request: Request):
    """Handle Razorpay webhooks for subscription events"""
    try:
        body = await request.body()
        signature = request.headers.get('x-razorpay-signature')
        
        if not signature:
            raise HTTPException(status_code=400, detail="Missing signature")

        # Verify webhook signature
        expected_signature = hmac.new(
            os.getenv("RAZORPAY_WEBHOOK_SECRET").encode(),
            body,
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(expected_signature, signature):
            raise HTTPException(status_code=400, detail="Invalid signature")

        # Parse webhook data
        webhook_data = json.loads(body)
        event = webhook_data.get("event")
        payload = webhook_data.get("payload", {})

        if event == "subscription.activated":
            await handle_subscription_activated(payload)
        elif event == "subscription.charged":
            await handle_subscription_charged(payload)
        elif event == "subscription.halted":
            await handle_subscription_halted(payload)
        elif event == "subscription.cancelled":
            await handle_subscription_cancelled(payload)
        elif event == "payment.captured":
            await handle_payment_captured(payload)
        elif event == "payment.failed":
            await handle_payment_failed(payload)
        else:
            print(f"Unhandled webhook event: {event}")

        return {"status": "success"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Webhook error: {str(e)}")

async def handle_subscription_activated(payload):
    """Handle subscription activation"""
    try:
        subscription = payload.get("subscription", {})
        notes = subscription.get("notes", {})
        organization_id = notes.get("organization_id")
        
        if organization_id:
            with db_manager.get_cursor() as cursor:
                cursor.execute("""
                    UPDATE ORGANIZATIONS 
                    SET ISPREMIUM = 1, RAZORPAY_SUBSCRIPTION_ID = ? 
                    WHERE ID = ?
                """, (subscription["id"], int(organization_id)))
                
        print(f"Subscription {subscription['id']} activated")
        
    except Exception as e:
        print(f"Error handling subscription activated: {str(e)}")

async def handle_subscription_charged(payload):
    """Handle successful subscription charge"""
    try:
        subscription = payload.get("subscription", {})
        notes = subscription.get("notes", {})
        organization_id = notes.get("organization_id")
        
        if organization_id:
            with db_manager.get_cursor() as cursor:
                cursor.execute("""
                    UPDATE ORGANIZATIONS 
                    SET ISPREMIUM = 1 
                    WHERE ID = ?
                """, (int(organization_id),))
                
        print(f"Subscription {subscription['id']} charged successfully")
        
    except Exception as e:
        print(f"Error handling subscription charged: {str(e)}")

async def handle_subscription_halted(payload):
    """Handle subscription halt"""
    try:
        subscription = payload.get("subscription", {})
        notes = subscription.get("notes", {})
        organization_id = notes.get("organization_id")
        
        if organization_id:
            with db_manager.get_cursor() as cursor:
                cursor.execute("""
                    UPDATE ORGANIZATIONS 
                    SET ISPREMIUM = 0 
                    WHERE ID = ?
                """, (int(organization_id),))
                
        print(f"Subscription {subscription['id']} halted")
        
    except Exception as e:
        print(f"Error handling subscription halted: {str(e)}")

async def handle_subscription_cancelled(payload):
    """Handle subscription cancellation"""
    try:
        subscription = payload.get("subscription", {})
        notes = subscription.get("notes", {})
        organization_id = notes.get("organization_id")
        
        if organization_id:
            with db_manager.get_cursor() as cursor:
                cursor.execute("""
                    UPDATE ORGANIZATIONS 
                    SET ISPREMIUM = 0 
                    WHERE ID = ?
                """, (int(organization_id),))
                
        print(f"Subscription {subscription['id']} cancelled")
        
    except Exception as e:
        print(f"Error handling subscription cancelled: {str(e)}")

async def handle_payment_captured(payload):
    """Handle successful payment capture"""
    try:
        payment = payload.get("payment", {})
        entity = payment.get("entity", {})
        notes = entity.get("notes", {})
        organization_id = notes.get("organization_id")
        
        if organization_id:
            with db_manager.get_cursor() as cursor:
                cursor.execute("""
                    UPDATE ORGANIZATIONS 
                    SET ISPREMIUM = 1 
                    WHERE ID = ?
                """, (int(organization_id),))
                
        print(f"Payment {payment['id']} captured successfully")
        
    except Exception as e:
        print(f"Error handling payment captured: {str(e)}")

async def handle_payment_failed(payload):
    """Handle failed payment"""
    try:
        payment = payload.get("payment", {})
        entity = payment.get("entity", {})
        notes = entity.get("notes", {})
        organization_id = notes.get("organization_id")
        
        if organization_id:
            with db_manager.get_cursor() as cursor:
                cursor.execute("""
                    UPDATE ORGANIZATIONS 
                    SET ISPREMIUM = 0 
                    WHERE ID = ?
                """, (int(organization_id),))
                
        print(f"Payment {payment['id']} failed")
        
    except Exception as e:
        print(f"Error handling payment failed: {str(e)}")

@router.get("/subscription/{organization_id}")
async def get_subscription_status(organization_id: int):
    """Get subscription status for an organization"""
    try:
        with db_manager.get_cursor() as cursor:
            cursor.execute("""
                SELECT ISPREMIUM, RAZORPAY_SUBSCRIPTION_ID 
                FROM ORGANIZATIONS 
                WHERE ID = ?
            """, (organization_id,))
            
            result = cursor.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Organization not found")
            
            is_premium, subscription_id = result
            
            return {
                "isPremium": bool(is_premium),
                "subscriptionId": subscription_id,
                "organizationId": organization_id
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get subscription status: {str(e)}") 