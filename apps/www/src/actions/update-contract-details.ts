"use server"

import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export async function updateContractDetails(
  contractId: number | null,
  data: any,
  currentPath: string,
) {
  const user = await getCurrentUser()
  const userId = user?.id

  if (!userId) {
    console.error("No user is currently logged in.")
    return { success: false, error: "No user is currently logged in." }
  }

  try {
    const userWorkspace = await prisma.workspace.findFirst({
      where: {
        users: {
          some: {
            id: userId,
          },
        },
      },
      select: {
        id: true,
      },
    })

    if (!userWorkspace) {
      console.error("No workspace found for this user.")
      return { success: false, error: "No workspace found for this user." }
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: data.tenantId },
      include: {
        building: true,
        property: true,
      },
    })

    if (!tenant || !tenant.building || !tenant.property) {
      console.error("Tenant or associated building/property not found.")
      return {
        success: false,
        error: "Tenant or associated building/property not found.",
      }
    }

    let contract

    if (contractId && contractId !== 0) {
      // Update existing contract
      contract = await prisma.contract.update({
        where: { id: contractId },
        data: {
          contractType: data.contractType,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          negotiationDate: new Date(data.negotiationDate),
          baseRent: data.baseRent,
          indexationType: data.indexationType,
          indexValue: data.indexValue,
        },
      })
    } else {
      // Create new contract
      contract = await prisma.contract.create({
        data: {
          tenantId: data.tenantId,
          contractType: data.contractType,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          negotiationDate: new Date(data.negotiationDate),
          baseRent: data.baseRent,
          indexationType: data.indexationType,
          indexValue: data.indexValue,
          buildingId: tenant.building.id,
          workspaceId: userWorkspace.id,
          propertyId: tenant.property.id,
        },
      })
    }

    revalidatePath(currentPath)

    return { success: true, contract }
  } catch (error) {
    console.error("Error updating contract details:", error)
    return { success: false, error: error.message }
  }
}
