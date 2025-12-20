"""
Blockchain Audit Log Service using Polygon.
"""
import json
import hashlib
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.advanced import BlockchainAuditLog


class BlockchainService:
    """Service for blockchain-based audit logs on Polygon."""
    
    def __init__(self):
        self.network = getattr(settings, 'BLOCKCHAIN_NETWORK', 'polygon')
        self.rpc_url = getattr(settings, 'POLYGON_RPC_URL', 'https://polygon-rpc.com')
        self.private_key = getattr(settings, 'BLOCKCHAIN_PRIVATE_KEY', '')
        self.contract_address = getattr(settings, 'AUDIT_CONTRACT_ADDRESS', '')
        self.polygonscan_api_key = getattr(settings, 'POLYGONSCAN_API_KEY', '')
    
    def _compute_hash(self, data: Dict[str, Any]) -> str:
        """Compute Keccak256 hash of data."""
        try:
            from web3 import Web3
            json_str = json.dumps(data, sort_keys=True, default=str)
            return Web3.keccak(text=json_str).hex()
        except ImportError:
            # Fallback to SHA256 if web3 not installed
            json_str = json.dumps(data, sort_keys=True, default=str)
            return "0x" + hashlib.sha256(json_str.encode()).hexdigest()
    
    def _get_web3(self):
        """Get Web3 instance."""
        try:
            from web3 import Web3
            return Web3(Web3.HTTPProvider(self.rpc_url))
        except ImportError:
            raise ImportError("web3 package not installed")
    
    async def create_audit_log(
        self,
        db: Session,
        user_id: UUID,
        action: str,
        entity_type: str,
        entity_id: UUID,
        payload: Dict[str, Any]
    ) -> BlockchainAuditLog:
        """Create an audit log entry and submit to blockchain."""
        # Compute hash of payload
        data_hash = self._compute_hash({
            "action": action,
            "entity_type": entity_type,
            "entity_id": str(entity_id),
            "payload": payload,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Create database record
        audit_log = BlockchainAuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            data_hash=data_hash,
            payload=payload,
            network=self.network,
            status="pending"
        )
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)
        
        # Submit to blockchain (async background task in production)
        try:
            tx_hash = await self._submit_to_blockchain(data_hash)
            if tx_hash:
                audit_log.transaction_hash = tx_hash
                audit_log.status = "submitted"
                db.commit()
        except Exception as e:
            audit_log.status = "failed"
            db.commit()
            # Log error but don't raise - audit log is still in DB
        
        return audit_log
    
    async def _submit_to_blockchain(self, data_hash: str) -> Optional[str]:
        """Submit hash to blockchain."""
        if not self.private_key or not self.contract_address:
            # If not configured, simulate with null transaction
            return None
        
        try:
            from web3 import Web3
            from eth_account import Account
            
            w3 = self._get_web3()
            
            # ABI for simple audit log contract
            abi = [
                {
                    "inputs": [{"type": "bytes32", "name": "hash"}],
                    "name": "logHash",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                }
            ]
            
            contract = w3.eth.contract(
                address=Web3.to_checksum_address(self.contract_address),
                abi=abi
            )
            
            account = Account.from_key(self.private_key)
            
            # Build transaction
            tx = contract.functions.logHash(
                Web3.to_bytes(hexstr=data_hash)
            ).build_transaction({
                'from': account.address,
                'nonce': w3.eth.get_transaction_count(account.address),
                'gas': 100000,
                'gasPrice': w3.eth.gas_price
            })
            
            # Sign and send
            signed = account.sign_transaction(tx)
            tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
            
            return tx_hash.hex()
            
        except Exception as e:
            print(f"Blockchain submission error: {e}")
            return None
    
    async def verify_audit_log(
        self,
        db: Session,
        audit_log_id: UUID
    ) -> Dict[str, Any]:
        """Verify an audit log against blockchain."""
        audit_log = db.query(BlockchainAuditLog).filter(
            BlockchainAuditLog.id == audit_log_id
        ).first()
        
        if not audit_log:
            return {
                "is_valid": False,
                "message": "Audit log not found"
            }
        
        if not audit_log.transaction_hash:
            return {
                "is_valid": True,
                "stored_hash": audit_log.data_hash,
                "message": "Log recorded locally only (blockchain submission pending or not configured)"
            }
        
        try:
            # Query blockchain for the transaction
            on_chain_hash = await self._get_hash_from_blockchain(
                audit_log.transaction_hash
            )
            
            is_valid = on_chain_hash == audit_log.data_hash
            
            return {
                "is_valid": is_valid,
                "on_chain_hash": on_chain_hash,
                "stored_hash": audit_log.data_hash,
                "block_number": audit_log.block_number,
                "message": "Hash verified on blockchain" if is_valid else "Hash mismatch - potential tampering"
            }
            
        except Exception as e:
            return {
                "is_valid": None,
                "stored_hash": audit_log.data_hash,
                "message": f"Unable to verify: {str(e)}"
            }
    
    async def _get_hash_from_blockchain(self, tx_hash: str) -> Optional[str]:
        """Retrieve logged hash from blockchain transaction."""
        try:
            w3 = self._get_web3()
            tx = w3.eth.get_transaction(tx_hash)
            
            # Decode input data to get the hash
            # This is simplified - actual implementation depends on contract
            if tx and tx.input and len(tx.input) >= 68:
                # Skip function selector (4 bytes) and get hash parameter
                return "0x" + tx.input[10:74]
            
            return None
        except Exception:
            return None
    
    async def update_confirmations(self, db: Session) -> int:
        """Update confirmation count for pending transactions."""
        updated = 0
        
        pending_logs = db.query(BlockchainAuditLog).filter(
            BlockchainAuditLog.status == "submitted",
            BlockchainAuditLog.transaction_hash.isnot(None)
        ).all()
        
        try:
            w3 = self._get_web3()
            current_block = w3.eth.block_number
            
            for log in pending_logs:
                try:
                    receipt = w3.eth.get_transaction_receipt(log.transaction_hash)
                    if receipt:
                        log.block_number = receipt.blockNumber
                        log.confirmations = current_block - receipt.blockNumber
                        
                        if log.confirmations >= 12:  # Consider confirmed after 12 blocks
                            log.status = "confirmed"
                            log.confirmed_at = datetime.utcnow()
                        
                        log.gas_used = receipt.gasUsed
                        updated += 1
                except Exception:
                    continue
            
            db.commit()
        except Exception:
            pass
        
        return updated
    
    def get_audit_logs(
        self,
        db: Session,
        user_id: Optional[UUID] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[UUID] = None,
        limit: int = 100
    ) -> List[BlockchainAuditLog]:
        """Get audit logs with filters."""
        query = db.query(BlockchainAuditLog)
        
        if user_id:
            query = query.filter(BlockchainAuditLog.user_id == user_id)
        if entity_type:
            query = query.filter(BlockchainAuditLog.entity_type == entity_type)
        if entity_id:
            query = query.filter(BlockchainAuditLog.entity_id == entity_id)
        
        return query.order_by(BlockchainAuditLog.submitted_at.desc()).limit(limit).all()
    
    def get_audit_log(self, db: Session, log_id: UUID) -> Optional[BlockchainAuditLog]:
        """Get specific audit log."""
        return db.query(BlockchainAuditLog).filter(
            BlockchainAuditLog.id == log_id
        ).first()


# Singleton instance
blockchain_service = BlockchainService()
