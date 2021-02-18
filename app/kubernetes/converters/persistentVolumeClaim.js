import _ from 'lodash-es';
import * as JsonPatch from 'fast-json-patch';

import { KubernetesPersistentVolumeClaim } from 'Kubernetes/models/volume/models';
import { KubernetesPersistentVolumClaimCreatePayload } from 'Kubernetes/models/volume/payloads';
import { KubernetesPortainerApplicationOwnerLabel, KubernetesPortainerApplicationNameLabel } from 'Kubernetes/models/application/models';

class KubernetesPersistentVolumeClaimConverter {
  static apiToPersistentVolumeClaim(data, storageClasses, yaml) {
    const res = new KubernetesPersistentVolumeClaim();
    res.Id = data.metadata.uid;
    res.Name = data.metadata.name;
    res.Namespace = data.metadata.namespace;
    res.CreationDate = data.metadata.creationTimestamp;
    res.Storage = data.spec.resources.requests.storage.replace('i', 'B');
    res.StorageClass = _.find(storageClasses, { Name: data.spec.storageClassName });
    res.Yaml = yaml ? yaml.data : '';
    res.ApplicationOwner = data.metadata.labels ? data.metadata.labels[KubernetesPortainerApplicationOwnerLabel] : '';
    res.ApplicationName = data.metadata.labels ? data.metadata.labels[KubernetesPortainerApplicationNameLabel] : '';
    res.PersistentVolumeName = data.spec.volumeName;
    return res;
  }

  /**
   * Generate KubernetesPersistentVolumeClaim list from KubernetesApplicationFormValues
   * @param {KubernetesApplicationFormValues} formValues
   */
  static applicationFormValuesToVolumeClaims(formValues) {
    _.remove(formValues.PersistedFolders, (item) => item.NeedsDeletion);
    const res = _.map(formValues.PersistedFolders, (item) => {
      const pvc = new KubernetesPersistentVolumeClaim();
      if (!_.isEmpty(item.ExistingVolume)) {
        const existantPVC = item.ExistingVolume.PersistentVolumeClaim;
        pvc.Name = existantPVC.Name;
        if (item.PersistentVolumeClaimName) {
          pvc.PreviousName = item.PersistentVolumeClaimName;
        }
        pvc.StorageClass = existantPVC.StorageClass;
        pvc.Storage = existantPVC.Storage.charAt(0) + 'i';
        pvc.CreationDate = existantPVC.CreationDate;
        pvc.Id = existantPVC.Id;
      } else {
        if (item.PersistentVolumeClaimName) {
          pvc.Name = item.PersistentVolumeClaimName;
          pvc.PreviousName = item.PersistentVolumeClaimName;
        } else {
          pvc.Name = formValues.Name + '-' + pvc.Name;
        }
        pvc.Storage = '' + item.Size + item.SizeUnit.charAt(0) + 'i';
        pvc.StorageClass = item.StorageClass;
      }
      pvc.MountPath = item.ContainerPath;
      pvc.Namespace = formValues.ResourcePool.Namespace.Name;
      pvc.ApplicationOwner = formValues.ApplicationOwner;
      pvc.ApplicationName = formValues.Name;
      return pvc;
    });
    return res;
  }

  /**
   * Generate KubernetesPersistentVolumeClaim from KubernetesVolumeFormValues
   * @param {KubernetesVolumeFormValues} formValues
   */
  static volumeFormValuesToVolumeClaim(formValues) {
    const pvc = new KubernetesPersistentVolumeClaim();
    pvc.Name = formValues.Name;
    pvc.Namespace = formValues.ResourcePool.Namespace.Name;
    pvc.Storage = '' + formValues.Size + formValues.SizeUnit.charAt(0) + 'i';
    pvc.MountPath = formValues.NFSMountPoint;
    return pvc;
  }

  static createPayload(pvc) {
    const res = new KubernetesPersistentVolumClaimCreatePayload();
    res.metadata.name = pvc.Name;
    res.metadata.namespace = pvc.Namespace;
    res.spec.resources.requests.storage = pvc.Storage;
    if (pvc.StorageClass) {
      res.spec.storageClassName = pvc.StorageClass.Name;
    }
    res.metadata.labels.app = pvc.ApplicationName;
    res.metadata.labels[KubernetesPortainerApplicationOwnerLabel] = pvc.ApplicationOwner;
    res.metadata.labels[KubernetesPortainerApplicationNameLabel] = pvc.ApplicationName;
    if (pvc.PersistentVolumeName) {
      res.spec.volumeName = pvc.PersistentVolumeName;
    }
    console.log(pvc)
    console.log(res)
    return res;
  }

  static patchPayload(oldPVC, newPVC) {
    const oldPayload = KubernetesPersistentVolumeClaimConverter.createPayload(oldPVC);
    const newPayload = KubernetesPersistentVolumeClaimConverter.createPayload(newPVC);
    const payload = JsonPatch.compare(oldPayload, newPayload);
    return payload;
  }
}

export default KubernetesPersistentVolumeClaimConverter;
