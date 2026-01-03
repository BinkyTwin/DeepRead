/**
 * Lock manager pour éviter la génération d'embeddings en parallèle pour un même paper
 * Version simplifiée: utilise embedding_status comme lock (processing = en cours)
 */

import { createClient } from "@/lib/supabase/server";

/**
 * Tente d'acquérir un lock pour un paper
 * @param paperId - ID du paper
 * @returns true si lock acquéri, false si déjà en cours
 */
export async function acquireLock(paperId: string): Promise<boolean> {
  const supabase = await createClient();

  try {
    // Marquer le paper comme "processing" = lock
    const { data: paper, error } = await supabase
      .from("papers")
      .update({ embedding_status: "processing" })
      .eq("id", paperId)
      .select("embedding_status")
      .maybeSingle();

    // Si erreur PGRST116 = pas de ligne modifiée (déjà "processing")
    if (error) {
      if (error.code === "PGRST116") {
        console.log(`[LOCK] Paper ${paperId} is already locked (status already processing)`);
        return false;
      }
      throw error;
    }

    // Si le statut actuel n'était pas "processing", on a acquéri le lock
    const wasProcessing = paper?.embedding_status === "processing";
    if (!wasProcessing) {
      console.log(`[LOCK] Acquired lock for paper ${paperId} (status changed to processing)`);
      return true;
    }

    // Déjà "processing" = lock déjà existe
    console.log(`[LOCK] Paper ${paperId} is already locked (status already processing)`);
    return false;
  } catch (error) {
    console.error(`[LOCK] Failed to acquire lock for paper ${paperId}:`, error);
    throw error;
  }
}

/**
 * Libère un lock pour un paper
 * @param paperId - ID du paper
 * @param status - Nouveau statut (complete/partial/error)
 */
export async function releaseLock(paperId: string, status: string): Promise<void> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("papers")
      .update({ embedding_status: status })
      .eq("id", paperId);

    if (error) {
      console.error(`[LOCK] Failed to release lock for paper ${paperId}:`, error);
    } else {
      console.log(`[LOCK] Released lock for paper ${paperId} (status: ${status})`);
    }
  } catch (error) {
    console.error(`[LOCK] Error releasing lock for paper ${paperId}:`, error);
  }
}

/**
 * Vérifie si un paper est actuellement en cours de génération
 * @param paperId - ID du paper
 * @returns true si locké (en cours)
 */
export async function isLocked(paperId: string): Promise<boolean> {
  const supabase = await createClient();

  try {
    const { data: paper, error } = await supabase
      .from("papers")
      .select("embedding_status")
      .eq("id", paperId)
      .maybeSingle();

    if (error || !paper) {
      console.error(`[LOCK] Failed to check lock for paper ${paperId}:`, error);
      return false;
    }

    const locked = paper.embedding_status === "processing";
    if (locked) {
      console.log(`[LOCK] Paper ${paperId} is currently locked (status: processing)`);
    }

    return locked;
  } catch (error) {
    console.error(`[LOCK] Error checking lock for paper ${paperId}:`, error);
    return false;
  }
}

/**
 * Wrapper avec auto-release pour garantir le nettoyage du lock
 * @param paperId - ID du paper
 * @param finalStatus - Statut final (complete/partial/error)
 * @param operation - Fonction à exécuter avec le lock
 * @returns Résultat de l'opération
 */
export async function withLock<T>(
  paperId: string,
  finalStatus: string,
  operation: () => Promise<T>
): Promise<T> {
  const acquired = await acquireLock(paperId);

  if (!acquired) {
    throw new Error(
      `Embedding generation already in progress for paper ${paperId}. Please wait.`
    );
  }

  try {
    return await operation();
  } finally {
    await releaseLock(paperId, finalStatus);
  }
}
